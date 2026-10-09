/** An error whose message is safe (and written) to show to the person uploading. */
export class UserError extends Error {
  constructor(message, { status = 400, code = 'bad_request' } = {}) {
    super(message);
    this.name = 'UserError';
    this.status = status;
    this.code = code;
  }
}
