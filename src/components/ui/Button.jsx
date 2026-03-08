import { forwardRef } from 'react'

const variants = {
  primary: 'bg-accent text-bg hover:bg-accent/90',
  secondary: 'bg-panel text-text border border-border hover:border-accent/50',
  danger: 'bg-danger text-white hover:bg-danger/90',
  ghost: 'bg-transparent text-muted hover:text-text hover:bg-panel',
}

const sizes = {
  sm: 'px-3 py-1.5 text-[11px]',
  md: 'px-4 py-2 text-xs',
  lg: 'px-6 py-2.5 text-sm',
}

const Button = forwardRef(function Button({
  children, variant = 'primary', size = 'md', disabled, className = '', ...props
}, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold tracking-wide rounded-md
        transition-all duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        cursor-pointer
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
})

export default Button
