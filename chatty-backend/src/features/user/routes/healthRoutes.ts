import express, { Router, Request, Response } from 'express';
import moment from 'moment';
import axios from 'axios';
import { performance } from 'perf_hooks';
import HTPP_STATUS from 'http-status-codes';
import { config } from '@root/config';

class HealthRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public health(): Router {
    this.router.get('/health', (req: Request, res: Response) => {
      res.status(HTPP_STATUS.OK).json({
        status: 'OK',
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        message: `Health with process id ${process.pid} is OK on ${moment().format('LL')}`
      });
    });
    return this.router;
  }

  public env(): Router {
    this.router.get('/env', (req: Request, res: Response) => {
      res.status(HTPP_STATUS.OK).send(`This is the ${config.NODE_ENV} environment`);
    });
    return this.router;
  }

  public instance(): Router {
    this.router.get('/instance', async (req: Request, res: Response) => {
      const response = await axios({
        method: 'get',
        url: config.EC2_URL
      });
      res
        .status(HTPP_STATUS.OK)
        .send(`Server is running on EC2 with id ${response.data} and process id ${process.pid} on ${moment().format('LL')}`);
    });
    return this.router;
  }

  public fiboRoutes(): Router {
    this.router.get('/fibo/:num', async (req: Request, res: Response) => {
      const start: number = performance.now();
      const result: number = this.fibo(parseInt(req.params.num, 10));
      const end: number = performance.now();
      res
        .status(HTPP_STATUS.OK)
        .send(`Fibonacci of ${req.params.num} is ${result} and it took ${end - start} milliseconds to calculate with EC2`);
    });
    return this.router;
  }

  private fibo(data: number): number {
    if (data < 2) {
      return 1;
    } else {
      return this.fibo(data - 2) + this.fibo(data - 1);
    }
  }
}

export const healthRoutes: HealthRoutes = new HealthRoutes();
