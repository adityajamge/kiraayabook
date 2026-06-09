export function DarkModeInit({ dark }: { dark: boolean }) {
  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `if(${dark})document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark')`,
      }}
    />
  )
}
