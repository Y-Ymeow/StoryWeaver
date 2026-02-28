import { useContext, useReducer, type FunctionComponent } from 'preact/compat'
import { StoreContext } from './context'
import { initialState, reducer } from './types'

export const Provider: FunctionComponent<{ children: preact.ComponentChildren }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  )
}
