import { nimbus } from '../resource/index.js';
import { getUser } from '../utils.js';

export const helpHandler = async (type) => {
    const user = await getUser();
  
    const supportTypes = {
      feedback: nimbus.support.feedback,
      support: nimbus.support.support,
      docs: nimbus.support.docs,
      tooltipHover: nimbus.support.tooltipHover,
      tooltipDocs: nimbus.support.tooltipDocs
    };
  
    if (supportTypes[type]) {
      await supportTypes[type]({ userId: user?.id });
    } else {
      throw new Error(`Unsupported support type: ${type}`);
    }
  };
  