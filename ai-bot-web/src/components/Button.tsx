import clsx from 'clsx';
import type { ButtonHTMLAttributes, FunctionalComponent } from 'vue';

const Button: FunctionalComponent<ButtonHTMLAttributes> = (props, { slots }) => (
  <button {...props} type={props.type ?? 'button'} class={clsx(props.class)}>
    {slots.default?.()}
  </button>
);

Button.displayName = 'Button';

export default Button;
