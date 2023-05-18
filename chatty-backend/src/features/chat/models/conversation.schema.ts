import mongoose, { Model, model, Schema } from 'mongoose';
import { IConversationDocument } from '@chat/interfaces/conversation.interface';

const ConversationSchema: Schema = new Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const ConversationModel: Model<IConversationDocument> = model<IConversationDocument>('Conversation', ConversationSchema, 'Conversation');
export { ConversationModel };
