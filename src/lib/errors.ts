export class DomainError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = "DomainError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "No tenés permiso para hacer esto") {
    super(message);
    this.name = "ForbiddenError";
  }
}
