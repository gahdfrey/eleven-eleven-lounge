import "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    username: string;
    firstname: string;
    lastname: string;
    role: string;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      username: string;
      firstname: string;
      lastname: string;
      role: string;
    };
  }
}
