export class ServerError extends Error {
  constructor() {
    super();
    this.name = "ServerError";
    this.message = "Internal server error";
  }
}
