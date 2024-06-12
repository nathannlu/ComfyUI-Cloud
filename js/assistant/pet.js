//import { GIF } from "../libs/gif.js";
import { GameObject } from './core.js'

// Our sprite sheet is on a grid of 64pxs
// Each row is 64px tall, and each frame is 64px wide
const SPRITE_SIZE = 128
const SPRITE_SHEET = {
  JUMP: {
    row: 0,
    frames: 11,
  },
  IDLE1: {
    row: 1,
    frames: 5,
  },
  IDLE2: {
    row: 2,
    frames: 5,
  },
  SIT: {
    row: 3,
    frames: 9,
  },
  WALK: {
    row: 4,
    frames: 5,
  },
  RUN: {
    row: 5,
    frames: 8,
  },
  SNIFF: {
    row: 6,
    frames: 8,
  },
  SNIFF_WALK: {
    row: 7,
    frames: 8,
  },
}

/**
 * Base pet class
 */
export class Pet extends GameObject {
  constructor({ x, y, height, width }) {
    super(x, y, height, width)
    // Pet state
    this.x = x
    this.currentDirection = 'right'

    this.height = height
    this.width = width

    this.emote = false
    this.talk = false
    this.talkText = ''

    this.hungerPoints = 0

    // Properties here tell when the
    // pet to change directions. Right now
    // the pet will randomly change directions
    // after t seconds.
    this.time = 0
    this.directionDuration = 0

    // Assets
    this.petImage = new Image()
    this.petImage.src =
      'https://comfyui-output.nyc3.cdn.digitaloceanspaces.com/babycorgi-sprite-128x128.png'

    this.textBubble = new Image()
    this.textBubble.src =
        'https://comfyui-output.nyc3.cdn.digitaloceanspaces.com/text-bubble.png'

    this.age = 0
    this._initializePet()
  }

  async _initializePet() {
    this.talk = false
    this.talkText = ''
  }

  /**
   * Creates a list of animations from a spritesheet
   * - e.g. renderWalk, renderSniff_walk, renderIdle1
   */
  createSpriteAnimations(image) {
    Object.keys(SPRITE_SHEET).forEach((animName) => {
      // transform name to title case
      // FUNC1 -> Func1
      const titleCase =
        animName.charAt(0).toUpperCase() + animName.slice(1).toLowerCase()
      const funcName = `render${titleCase}`

      const spriteFrames = SPRITE_SHEET[animName].frames
      const spriteFramesY = SPRITE_SHEET[animName].row
      this[funcName] = (ctx, renderCount, slowFpsBy = 10) => {
        this.renderSpriteAnimation(
          ctx,
          image,
          {
            renderCount,
            spriteFrames: spriteFrames - 1,
            spriteFramesY,
            slowFpsBy,
          },
        )
      }
    })
  }

  setTalk(text, duration = 1000) {
    // set an emote for t seconds
    this.talk = true
    this.talkText = text

    setTimeout(() => {
      this.talk = false
    }, duration)
  }

  onClick() {
    console.log("clicked")
    this.setTalk('Woof!')
  }

  // _chooseRandomDirection() {
  //   const directions = ['left', 'right', 'idle1', 'idle2']

  //   const changeDirections = () => {
  //     const randomIndex = Math.floor(Math.random() * directions.length)
  //     this.currentDirection = directions[randomIndex]
  //   }

  //   if (Date.now() - this.time > this.directionDuration) {
  //     changeDirections()
  //     this.time = Date.now()
  //     this.directionDuration = Math.random() * 4000 + 1000
  //   }
  // }

  // // debug function
  _showHitBox(ctx) {
    if (!ctx) {
      console.error("Canvas context (ctx) is undefined.");
      return;
    }

    ctx.fillStyle = 'blue'
    if (ctx.fillRect) {
      ctx.fillRect(
        this.x, // x
        this.y,
        this.width,
        this.height,
      )
    }
  
  }



  // renderOnTop(ctx) {
  //   ctx.fillStyle = 'blue'
  //   ctx.fillRect(
  //     this.x, // x
  //     this.y - this.height,
  //     this.width,
  //     this.height,
  //   )
  // }

  // setEmote() {
  //   // set an emote for t seconds
  //   this.emote = true

  //   setTimeout(() => {
  //     this.emote = false
  //   }, 1000)
  // }

  // setTalk(text, duration = 1000) {
  //   // set an emote for t seconds
  //   this.talk = true
  //   this.talkText = text

  //   setTimeout(() => {
  //     this.talk = false
  //   }, duration)
  // }

  // onClick() {
  //   this.setTalk('Woof!')
  // }

  renderSpriteAnimation(ctx, spriteSheet, frameSettings) {
    const {
      renderCount,
      spriteFrames,
      spriteFramesY,
    } = frameSettings

    const _spriteFramesY = SPRITE_SIZE * spriteFramesY
    const spriteRenderSize = SPRITE_SIZE // This is the final size users see the sprite as
    // ctx.imageSmoothingEnabled = true
    // ctx.imageSmoothingQuality = 'high'

    // There is 5 frames in the sprite sheet for walking
    // so instead of doing this.renderCount % 4 (0 - 5 frames),
    // we do 0 - 50 frames and scale down for a lower image fps.
    const _frame = renderCount % (spriteFrames )
    const frame = Math.round(_frame)

    const currentRenderFrame = SPRITE_SIZE * frame

    // Offset
    const offsetX = (spriteRenderSize - this.width) / 2
    const offsetY = (spriteRenderSize - this.height) / 2

    if (ctx?.drawImage) {
      ctx.drawImage(
        spriteSheet,
        currentRenderFrame,
        _spriteFramesY,
        SPRITE_SIZE,
        SPRITE_SIZE,
        this.x - offsetX,
        this.y - offsetY,
        spriteRenderSize,
        spriteRenderSize,
      )
    }
    
  }


  move(ctx, renderCount) {
    // switch (this.currentDirection) {
    //   default:
    //   }
    this.renderIdle2(ctx, renderCount)
  }


  // renderTextBubble(ctx) {
  //   ctx.fillStyle = 'black'
  //   ctx.font = '14px Courier New'
  //   ctx.textAlign = 'center'
  //   ctx.textBaseline = 'middle'

  //   const textBubbleWidth = 70
  //   const textBubbleHeight = 40
  //   if (this.currentDirection == 'left') {
  //     const textBubbleX = -this.x - this.width + textBubbleWidth
  //     const textBubbleY = this.y - textBubbleHeight
  //     ctx.save()
  //     ctx.scale(-1, 1)
  //     ctx.drawImage(
  //       this.textBubble,
  //       textBubbleX,
  //       textBubbleY,
  //       textBubbleWidth,
  //       textBubbleHeight,
  //     )
  //     ctx.restore()

  //     // Calculate text position
  //     const textX = this.x - textBubbleWidth / 2
  //     const textY = textBubbleY + textBubbleHeight / 2

  //     ctx.fillText(this.talkText, textX, textY)
  //   } else {
  //     // this includes idle, and everything
  //     // else at the moment
  //     const textBubbleX = this.x + this.width
  //     const textBubbleY = this.y - textBubbleHeight

  //     ctx.drawImage(
  //       this.textBubble,
  //       textBubbleX,
  //       textBubbleY,
  //       textBubbleWidth,
  //       textBubbleHeight,
  //     )

  //     const textX = textBubbleX + textBubbleWidth / 2
  //     const textY = textBubbleY + textBubbleHeight / 2

  //     ctx.fillText(this.talkText, textX, textY)
  //   }
  // }

  render(ctx, renderCount) {
    this.createSpriteAnimations(this.petImage)

    // move the pet
    this._showHitBox(ctx)
    this.move(ctx, renderCount)
  }
}
