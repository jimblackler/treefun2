export function addBooleanSwitch(parent: HTMLElement, labelText: string,
                                 listener: (value: boolean) => void) {

  const label = document.createElement('label');
  parent.append(label);

  const span = document.createElement('span');
  label.append(span);
  span.append(labelText);

  const checkbox = document.createElement('input');
  label.append(checkbox);
  checkbox.setAttribute('type', 'checkbox');

  const update = (value: boolean) => {
    checkbox.checked = value;
  };

  checkbox.addEventListener('input', () => listener(checkbox.checked));

  return update;
}
