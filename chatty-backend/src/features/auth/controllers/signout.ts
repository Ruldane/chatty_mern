import HTTP_STATUS from 'http-status-codes';
import { Request, Response } from 'express';

export class SignOut {
  // This method is used to logout the user. It will clear the session data and return a success message.$*
  public async update(req: Request, res: Response): Promise<void> {
    req.session = null;
    res.status(HTTP_STATUS.OK).json({ message: 'User logout successfully', user: {}, token: '' });
  }
}
