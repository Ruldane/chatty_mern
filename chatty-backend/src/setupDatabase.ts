import mongoose from 'mongoose';
import { config } from '@root/config';
import Logger from 'bunyan';
import { redisConnection } from '@service/redis/redis.connection';

const log: Logger = config.createLogger('setupDatabase');

export default () => {
  /**
   * This function is used to connect to the MongoDB database
   * using the url provided in the config file
   * then connect to redis
   * and finally log the connection status
   * @param url - MongoDB database url
   * @function connect
   * @param {string} config.DATABASE_URL - MongoDB database url
   * @returns {Promise} - Promise object represents the connection
   */
  const connect = () => {
    mongoose
      .connect(`${config.DATABASE_URL}`)
      .then(() => {
        log.info('Connected to MongoDB');
        redisConnection.connect();
      })
      .catch((err) => {
        log.error('Errorrrrrrrrrrrrrrrr ', err);
        process.exit(1);
      });
  };
  connect();

  mongoose.connection.on('disconnected', connect);
};
