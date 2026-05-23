import { createContext } from "react";
import type React from "react";

export const TopbarNoteCtx = createContext<React.Dispatch<React.SetStateAction<React.ReactNode>>>(() => {});
