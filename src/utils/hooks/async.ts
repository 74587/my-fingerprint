import { useCallback, useEffect, useState } from "react"
import type { DependencyList, Dispatch, SetStateAction } from "react"
import { debounce, sharedAsync } from "../timer"

export const useDebounceState = <S>(initialState: S | (() => S), wait?: number): [S, Dispatch<SetStateAction<S>>, (value: S) => void] => {
  const [state, setState] = useState(initialState)
  return [state, setState, useDebounceCallback(setState, wait)]
}

export const useDebounceCallback = function <T extends (...args: any) => any>(callback: T, wait?: number, deps?: DependencyList) {
  return useCallback(debounce(callback, wait), deps ?? [])
}

export const useAsyncApi = <R, E = unknown>(
  func: () => Promise<R>,
  deps: React.DependencyList
) => {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<E>()

  const api = useCallback(sharedAsync(async () => {
    setIsPending(true)
    return func()
      .catch(setError)
      .finally(() => setIsPending(false))
  }), deps);

  return { api, isPending, error }
}

export const useAsyncValue = <R, E = unknown>(
  func: () => Promise<R>,
  deps: React.DependencyList
) => {
  const [value, setValue] = useState<R>()
  const [isPending, setIsPending] = useState(true)
  const [error, setError] = useState<E>()

  const refresh = useCallback(sharedAsync(() => {
    setIsPending(true);
    return func()
      .then(setValue)
      .catch(setError)
      .finally(() => setIsPending(false));
  }), deps)

  useEffect(() => {
    refresh();
  }, [refresh])

  return { value, setValue, isPending, error, refresh }
}