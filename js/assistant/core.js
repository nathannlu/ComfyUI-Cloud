
export class GameObject {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.id = "hi"
    this.isActive = true
  }

  onClick() {}

  // Check if this object is touching another object
  isTouching(otherObject) {
    return (
      this.x < otherObject.x + otherObject.width &&
      this.x + this.width > otherObject.x &&
      this.y < otherObject.y + otherObject.height &&
      this.y + this.height > otherObject.y
    )
  }

  delete() {
    this.isActive = false
  }
}
