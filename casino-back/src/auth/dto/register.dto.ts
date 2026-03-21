import { IsBoolean, IsDateString, IsString, Length, Matches, Equals } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username must contain only letters, numbers and underscores',
  })
  username: string;

  @IsString()
  @Length(1, 50)
  firstName: string;

  @IsString()
  @Length(1, 50)
  lastName: string;

  @IsDateString()
  birthDate: string;

  @IsString()
  @Matches(/^\d{5}-\d{5}$/, {
    message: 'phoneNumber must follow the format 00000-00000',
  })
  phoneNumber: string;

  @IsString()
  @Length(8, 128)
  password: string;

  @IsBoolean()
  @Equals(true, { message: 'You must accept the terms and conditions' })
  hasAcceptedTerms: boolean;
}