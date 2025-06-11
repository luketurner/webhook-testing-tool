if (!import.meta?.file)
  throw new Error("This module cannot be imported from the client.");
