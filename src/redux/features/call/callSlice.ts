import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

interface CallState {
  user: {
    img: string
    name: string
    title: string
  } | null
  isCallActive: boolean
}

const initialState: CallState = {
  user: null,
  isCallActive: true,
}

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    setCallUser: (state, action: PayloadAction<{ img: string; name: string; title: string }>) => {
      state.user = action.payload
    },
    setCallActive: (state, action: PayloadAction<boolean>) => {
      state.isCallActive = action.payload
    },
  },
})

export const { setCallUser, setCallActive } = callSlice.actions
export default callSlice.reducer
