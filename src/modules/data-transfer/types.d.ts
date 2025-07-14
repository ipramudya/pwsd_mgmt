import type {
  FieldRecord,
  PasswordFieldRecord,
  TextFieldRecord,
  TodoFieldRecord,
} from '../field/dto';

export type FieldWithData = {
  field: FieldRecord;
  textField: TextFieldRecord | null;
  passwordField: PasswordFieldRecord | null;
  todoField: TodoFieldRecord | null;
};

export type UserRecord = {
  username: string;
  uuid: string;
};

export type ProcessBlockOptions = {
  overwriteExisting: boolean;
  preserveUuids: boolean;
  skipInvalidData: boolean;
};
