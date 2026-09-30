import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, style, ...props }, ref) => {
    
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 500,
      fontFamily: 'inherit',
      transition: 'all 0.15s ease',
      cursor: 'pointer',
      border: '1px solid transparent',
      borderRadius: 'var(--radius)',
      lineHeight: '1.25',
      whiteSpace: 'nowrap',
      gap: '0.375rem',
    }

    const variantStyle: React.CSSProperties = (() => {
      switch (variant) {
        case 'primary':
          return { background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' }
        case 'secondary':
          return { background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }
        case 'outline':
          return { background: 'transparent', color: 'var(--brand)', borderColor: 'var(--brand)' }
        case 'ghost':
          return { background: 'transparent', color: 'var(--text-muted)', borderColor: 'transparent' }
        case 'danger':
          return { background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }
        default:
          return {}
      }
    })()

    const sizeStyle: React.CSSProperties = (() => {
      switch (size) {
        case 'sm': return { height: '30px', padding: '0 0.625rem', fontSize: 'var(--text-xs)' }
        case 'md': return { height: '36px', padding: '0 0.875rem', fontSize: 'var(--text-base)' }
        case 'lg': return { height: '44px', padding: '0 1.25rem', fontSize: 'var(--text-md)' }
        default:   return { height: '36px', padding: '0 0.875rem', fontSize: 'var(--text-base)' }
      }
    })()

    const disabledStyle: React.CSSProperties = (disabled || isLoading)
      ? { opacity: 0.5, pointerEvents: 'none' }
      : {}

    return (
      <button
        ref={ref}
        style={{ ...baseStyle, ...variantStyle, ...sizeStyle, ...disabledStyle, ...style }}
        className={className}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            style={{ animation: 'spin 1s linear infinite', width: '14px', height: '14px', marginRight: '4px' }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
