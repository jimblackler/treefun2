export function addValueSlider(parent: HTMLElement, labelText: string, name: string,
                               min: number, max: number, step: number,
                               listener: (value: number) => void) {

  const label = document.createElement('label');
  parent.append(label);
  label.setAttribute('for', name);
  label.append(labelText);

  const rangeInput = document.createElement('input');
  parent.append(rangeInput);
  rangeInput.setAttribute('type', 'range');
  rangeInput.setAttribute('name', name);
  rangeInput.setAttribute('min', `${min}`);
  rangeInput.setAttribute('max', `${max}`);
  rangeInput.setAttribute('step', `${step}`);

  const numericInput = document.createElement('input');
  parent.append(numericInput);

  const update = (value: number) => {
    rangeInput.value = `${value}`;
    numericInput.value = `${value}`;
  };

  function updateWith(str: string) {
    const value = Number.parseFloat(str);
    if (isNaN(value)) {
      return;
    }
    update(value);
    listener(value);
  }

  rangeInput.addEventListener('input', () => updateWith(rangeInput.value));
  numericInput.addEventListener('input', () => updateWith(numericInput.value));

  return update;
}
