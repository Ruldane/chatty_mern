import { Helpers } from '@global/helpers/helpers';
import { userService } from '@service/db/user.service';
import { ISearchUser } from '@user/interfaces/user.interface';
import { Request, Response } from 'express';
import HTPP_STATUS from 'http-status-codes';
import { UserCache } from '@service/redis/user.cache';
import { userQueue } from '@service/queus/user.queue';
import { joiValidation } from '@global/decorators/joi-validation.decorators';
import { basicInfoSchema, socialLinksSchema } from '@user/schemes/info';

const userCache: UserCache = new UserCache();

export class Edit {
  /**
   * Updates the basic information of a user.
   * @param req - The request object containing the user ID and the updated basic information.
   * @param res - The response object to send back a success message.
   */
  @joiValidation(basicInfoSchema)
  public async info(req: Request, res: Response): Promise<void> {
    // Loop through the updated basic information and update each field in the user cache
    for (const [key, value] of Object.entries(req.body)) {
      await userCache.updateSingleUserItemInCache(`${req.currentUser!.userId}`, key, `${value}`);
    }
    // Add a job to update the basic information in the database
    userQueue.addUserJob('updateBasicInfoInDB', { key: `${req.currentUser!.userId}`, value: req.body });
    // Send a success response with a 200 HTTP status code
    res.status(HTPP_STATUS.OK).json({ message: 'Updated successfully' });
  }

  /**
   * Updates the social links of a user.
   * @param req - The request object containing the user ID and the updated social links.
   * @param res - The response object to send back a success message.
   */
  @joiValidation(socialLinksSchema)
  public async social(req: Request, res: Response): Promise<void> {
    // Update the social links in the user cache
    await userCache.updateSingleUserItemInCache(`${req.currentUser!.userId}`, 'social', req.body);
    // Add a job to update the social links in the database
    userQueue.addUserJob('updateSocialLinksInDB', { key: `${req.currentUser!.userId}`, value: req.body });
    // Send a success response with a 200 HTTP status code
    res.status(HTPP_STATUS.OK).json({ message: 'Updated successfully' });
  }
}
