/**
 * Shared contract for every admin server action consumed through `useFormState`.
 *
 * Every action exported from a colocated `src/app/admin/<area>/actions.ts` module
 * follows the signature:
 *
 *   (prevState: ActionState, formData: FormData) => Promise<ActionState>
 *
 * `ok` is the only required key so actions can short-circuit with field errors
 * or a top-level message. Forms render `fieldErrors` under the matching inputs
 * (Spanish, naming the field) and `message` in a banner above the form.
 */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const ACTION_SUCCESS_MESSAGE = "Los cambios se guardaron correctamente.";

export const INITIAL_ACTION_STATE: ActionState = { ok: false };
