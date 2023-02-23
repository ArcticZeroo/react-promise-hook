import { useCallback, useEffect, useRef, useState } from 'react';

export enum PromiseStage {
	notRun,
	running,
	error,
	success
}

export interface IPromiseState<T> {
	stage: PromiseStage,
	value: T | undefined,
	error: any,
}

export interface IRunnablePromiseState<T> extends IPromiseState<T> {
	run: () => void
}

/**
 * Use a promise for state, which is immediately run each time the callback changes.
 * @param returnsPromise - A function which returns the promise for which you want to get the state of. You MUST
 *  wrap this callback in a useCallback unless you know it is already wrapped. If you do not wrap this callback,
 *  you are most likely going to see an infinite loop of calls.
 * @returns an object containing the current state of the promise, and a synchronous run method
 */
export const useImmediatePromiseState = <T>(returnsPromise: () => Promise<T>): IRunnablePromiseState<T> => {
	const [value, setValue] = useState<T | undefined>();
	const [error, setError] = useState<any>();
	const [stage, setStage] = useState(PromiseStage.notRun);

	const run = useCallback(() => {
		setValue(undefined);
		setError(undefined);
		setStage(PromiseStage.running);

		returnsPromise()
			.then(result => {
				setStage(PromiseStage.success);
				setValue(result);
				return result;
			})
			.catch(err => {
				setStage(PromiseStage.error);
				setError(err);
				return err;
			});
	}, [returnsPromise]);

	useEffect(() => {
		run();
	}, [run]);

	return {
		value,
		error,
		stage,
		run
	};
};

/**
 * Use an already-existing promise for state. Stage always starts at running.
 * @param promise
 */
export const useExistingPromiseState = <T>(promise: Promise<T>): IPromiseState<T> => {
	const [value, setValue] = useState<T | undefined>();
	const [error, setError] = useState<any>();
	const [stage, setStage] = useState(PromiseStage.running);

	useEffect(() => {
		setStage(PromiseStage.running);

		promise
			.then(value => {
				setValue(value);
				setStage(PromiseStage.success);
				return value;
			})
			.catch(error => {
				setError(error);
				setStage(PromiseStage.error);
				return error;
			});
	}, [promise]);

	return {
		value,
		error,
		stage
	};
};

/**
 * Differs from useImmediatePromiseState in two ways:
 * - The returnsPromise function is not immediately called - it must be called by you
 * - It is resilient to multiple calls at once
 * @param returnsPromise
 * @param keepLastValue - Whether to keep the last value returned by a promise. This can be useful to avoid flashing.
 */
export const useDelayedPromiseState = <T>(returnsPromise: () => Promise<T>, keepLastValue: boolean = true): IRunnablePromiseState<T> => {
	const [value, setValue] = useState<T | undefined>();
	const [error, setError] = useState<any>();
	const [stage, setStage] = useState(PromiseStage.notRun);
	const currentSymbol = useRef<symbol | null>(null);

	const run = useCallback(() => {
		if (!keepLastValue) {
			setValue(undefined);
		}
		setError(undefined);

		// If we've never run before (or we don't want to keep the last value),
		// we can set to running in order to show a first-time loading spinner
		if (!keepLastValue || currentSymbol.current == null) {
			setStage(PromiseStage.running);
		}

		const thisRunSymbol = Symbol();
		currentSymbol.current = thisRunSymbol;

		returnsPromise()
			.then(result => {
				if (currentSymbol.current === thisRunSymbol) {
					setStage(PromiseStage.success);
					setValue(result);
				}
				return result;
			})
			.catch(err => {
				if (currentSymbol.current === thisRunSymbol) {
					setStage(PromiseStage.error);
					setValue(undefined);
					setError(err);
				}
				return err;
			});
	}, [returnsPromise, keepLastValue]);

	return {
		value,
		error,
		stage,
		run
	};
};