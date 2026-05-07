export function AppIcon({ children, size = 18, className = '', ...props }) {
  const classes = ['app-icon', className].filter(Boolean).join(' ')

  return (
    <svg
      className={classes}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function SearchIcon(props) {
  return (
    <AppIcon {...props}>
      <path
        d="M10.5 4.5a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm7.2 13.2L15.1 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </AppIcon>
  )
}

export function PlusIcon(props) {
  return (
    <AppIcon {...props}>
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </AppIcon>
  )
}

export function DoorOpenIcon(props) {
  return (
    <AppIcon {...props}>
      <path d="M7 4.5h7.5v15H7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12.5 12H7M15.5 12h1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.2 9.5v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </AppIcon>
  )
}

export function DownloadIcon(props) {
  return (
    <AppIcon {...props}>
      <path d="M12 4.5v8.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M8.8 9.7 12 12.9l3.2-3.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 15.5h13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </AppIcon>
  )
}

export function CheckIcon(props) {
  return (
    <AppIcon {...props}>
      <path d="M5.5 12.5 10 17 18.5 7.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </AppIcon>
  )
}

export function FlagIcon(props) {
  return (
    <AppIcon {...props}>
      <path d="M6 5.5v13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 6.5c2.2-1.3 4.3-1.3 6.5 0s4.3 1.3 6.5 0v6c-2.2 1.3-4.3 1.3-6.5 0s-4.3-1.3-6.5 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </AppIcon>
  )
}

export function PencilIcon(props) {
  return (
    <AppIcon {...props}>
      <path
        d="M4.5 15.5 15.8 4.2c.5-.5 1.2-.5 1.7 0l2.3 2.3c.5.5.5 1.2 0 1.7L8.5 19.5l-4.7.9.7-4.9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M13.7 6.3 17.8 10.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </AppIcon>
  )
}

export function TrashIcon(props) {
  return (
    <AppIcon {...props}>
      <path d="M4.5 7h15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M9 7V5.8c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3V7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.8 7.5l.5 11.2c0 .8.6 1.3 1.3 1.3h4.8c.7 0 1.3-.5 1.3-1.3l.5-11.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10.2 10.2v5.6M13.8 10.2v5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </AppIcon>
  )
}

export function EyeIcon(props) {
  return (
    <AppIcon {...props}>
      <path
        d="M2.8 12s3.1-6 9.2-6s9.2 6 9.2 6s-3.1 6-9.2 6S2.8 12 2.8 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </AppIcon>
  )
}

export function ImportIcon(props) {
  return (
    <AppIcon {...props}>
      <path d="M12 4.5v8.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M8.8 9.7 12 12.9l3.2-3.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 15.5h13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </AppIcon>
  )
}

export function ChevronLeftIcon(props) {
  return (
    <AppIcon {...props}>
      <path d="M14.5 5.8 8.3 12l6.2 6.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </AppIcon>
  )
}

export function ChevronRightIcon(props) {
  return (
    <AppIcon {...props}>
      <path d="M9.5 5.8 15.7 12l-6.2 6.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </AppIcon>
  )
}

export function ChevronsLeftIcon(props) {
  return (
    <AppIcon {...props}>
      <path d="M16.2 5.8 10 12l6.2 6.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.2 5.8 5 12l6.2 6.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </AppIcon>
  )
}

export function ChevronsRightIcon(props) {
  return (
    <AppIcon {...props}>
      <path d="M7.8 5.8 14 12l-6.2 6.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.8 5.8 19 12l-6.2 6.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </AppIcon>
  )
}

export function RefreshIcon(props) {
  return (
    <AppIcon {...props}>
      <path
        d="M19.5 12a7.5 7.5 0 0 0-12.8-5.3L5.6 8.2M4.5 12a7.5 7.5 0 0 0 12.8 5.3l1.1-1.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5.2 5.8v2.6h2.6M18.8 18.2v-2.6h-2.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </AppIcon>
  )
}

export function CloseIcon(props) {
  return (
    <AppIcon {...props}>
      <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </AppIcon>
  )
}