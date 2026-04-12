import type { SVGProps } from 'react'
import { useId } from 'react'

/**
 * Neato_Pilot brand wordmark — icon (green) + "Neato_Pilot" text as a single SVG.
 * Use when expanded; use the plain `Sim` icon when collapsed.
 * @param props - SVG properties including className, style, etc.
 */
export function Wordmark(props: SVGProps<SVGSVGElement>) {
  const gradientId = useId()

  return (
    <svg
      fill='none'
      height='22'
      viewBox='0 0 160 22'
      width='160'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <g transform='scale(.07483)'>
        <path
          clipRule='evenodd'
          d='m142.793 124.175c0 4.75-1.88 9.312-5.216 12.671l-.478.481c-3.334 3.369-7.863 5.252-12.58 5.252h-106.7127c-9.82776 0-17.8063 8.026-17.8063 17.924v115.407c0 9.898 7.97854 17.924 17.8063 17.924h114.5767c9.828 0 17.796-8.026 17.796-17.924v-108.052c0-4.405 1.735-8.632 4.83-11.749 3.086-3.108 7.283-4.856 11.657-4.856h108.5c9.828 0 17.796-8.024 17.796-17.923v-115.4069c0-9.89798-7.968-17.9231-17.796-17.9231h-114.578c-9.827 0-17.795 8.02512-17.795 17.9231zm34.771-99.6079h80.617c5.744 0 10.389 4.6874 10.389 10.463v81.1939c0 5.774-4.645 10.463-10.389 10.463h-80.617c-5.734 0-10.389-4.689-10.389-10.463v-81.1939c0-5.7756 4.655-10.463 10.389-10.463z'
          fill='#33c482'
          fillRule='evenodd'
        />
        <path
          d='m275.293 171.578h-85.187c-10.327 0-18.7 8.432-18.7 18.834v84.75c0 10.402 8.373 18.834 18.7 18.834h85.187c10.328 0 18.701-8.432 18.701-18.834v-84.75c0-10.402-8.373-18.834-18.701-18.834z'
          fill='#33c482'
        />
        <path
          d='m275.293 171.18h-85.187c-10.327 0-18.7 8.432-18.7 18.834v84.749c0 10.402 8.373 18.833 18.7 18.833h85.187c10.328 0 18.701-8.431 18.701-18.833v-84.749c0-10.402-8.373-18.834-18.701-18.834z'
          fill={`url(#${gradientId})`}
          fillOpacity='.2'
        />
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits='userSpaceOnUse'
            x1='171.406'
            x2='245.831'
            y1='171.18'
            y2='245.428'
          >
            <stop offset='0' />
            <stop offset='1' stopOpacity='0' />
          </linearGradient>
        </defs>
      </g>
      <text
        x='28'
        y='17'
        fill='currentColor'
        fontFamily='system-ui, -apple-system, sans-serif'
        fontSize='16'
        fontWeight='500'
        letterSpacing='-0.02em'
      >
        Neato_Pilot
      </text>
    </svg>
  )
}
