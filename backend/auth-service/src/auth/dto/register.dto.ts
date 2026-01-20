import { IsEmail, IsNotEmpty, IsEnum, MinLength } from 'class-validator';

export enum Role {
    CANDIDATE = 'CANDIDATE',
    RECRUITER = 'RECRUITER',
    ADMIN = 'ADMIN', // Secured by Admin Guard later
}

export class RegisterDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsNotEmpty()
    @MinLength(8)
    password: string;

    @IsEnum(Role)
    role: Role;
}
