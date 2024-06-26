import { nimbus } from '../resource/index.js';
import { getUser } from '../utils.js';

export const helpHandler = async (type) => {
    const user = await getUser();
  
    const supportTypes = {
      feedback: nimbus.support.feedback,
      support: nimbus.support.support,
      docs: nimbus.support.docs,
      tooltipHover: nimbus.support.tooltipHover,
      tooltipDocs: nimbus.support.tooltipDocs,
      assistant: nimbus.support.assistant
    };
  
    if (supportTypes[type]) {
      await supportTypes[type]({ user_id: user?.id });
    } else {
      throw new Error(`Unsupported support type: ${type}`);
    }
  };
  