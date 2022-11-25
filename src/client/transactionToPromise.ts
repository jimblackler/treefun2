export function transactionToPromise<T>(transaction: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error);
    transaction.onsuccess = () => resolve(transaction.result);
  })
}
