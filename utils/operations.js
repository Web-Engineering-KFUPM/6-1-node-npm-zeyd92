export function add(numbers) {
  return numbers.reduce((sum, n) => sum + n, 0);
}

export function subtract(numbers) {
  return numbers.slice(1).reduce((acc, n) => acc - n, numbers[0]);
}

export function multiply(numbers) {
  return numbers.reduce((acc, n) => acc * n, 1);
}

export function divide(numbers) {
  return numbers.slice(1).reduce((acc, n) => acc / n, numbers[0]);
}

