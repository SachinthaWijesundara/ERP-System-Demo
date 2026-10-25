import { useEffect, useRef } from 'react'

// Runs `fn` when any of `values` changes after the first render, but not on
// the first render itself. Pages use it to go back to their list when the
// search text or branch changes, without undoing a record opened on arrival.
export function useOnChange(values, fn) {
  const last = useRef(values)
  useEffect(() => {
    if (values.every((v, i) => v === last.current[i])) return
    last.current = values
    fn()
  })
}
