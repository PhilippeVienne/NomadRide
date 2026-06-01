import { handle } from 'hono/aws-lambda';
import app from './app';

// This is the entry point for AWS Lambda
export const handler = handle(app);
