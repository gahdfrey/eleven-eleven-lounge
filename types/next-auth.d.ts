import "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    firstname: string;
    lastname: string;
    role: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      firstname: string;
      lastname: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    firstname: string;
    lastname: string;
    role: string;
  }
}
