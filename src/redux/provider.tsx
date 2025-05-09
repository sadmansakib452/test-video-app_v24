"use client"

import { Provider } from "react-redux"
import { store } from "./store"
import type React from "react"

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>
}
