import { createSlice } from '@reduxjs/toolkit';
export const currentSession = createSlice({
  name: 'currentSession',
  initialState: {
    scenario: 'deactivate',
  },
  reducers: {},
});
export const getScenario = state => state.currentSession.scenario;
export default currentSession.reducer;
