import { createContext, useContext } from "react";

// Everything modules need about the signed-in person and the office:
// { office, me, can(perm), directory, person(id), navigate(module, param), openPerson(id), reload() }
export const OfficeContext = createContext(null);
export function useOffice() { return useContext(OfficeContext); }
