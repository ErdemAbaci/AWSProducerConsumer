type AuthenticatedEvent = {
  requestContext?: {
    authorizer?: {
      jwt?: {
        claims?: {
          sub?: string;
        };
      };
    };
  };
};

export function getCurrentUserId(event: AuthenticatedEvent): string {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;

  if (!userId) {
    throw new Error("Authenticated user id could not be determined");
  }

  return userId;
}