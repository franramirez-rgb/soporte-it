'use client'

import type { MouseEvent } from 'react'

export function DeleteUserButton({
  action,
  userName,
}: {
  action: () => Promise<void>
  userName: string
}) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const confirmed = window.confirm(
      `¿Eliminar definitivamente a ${userName}?\n\nSe eliminará su acceso y los datos dependientes asociados. Los equipos asignados quedarán sin asignar.`
    )

    if (!confirmed) event.preventDefault()
  }

  return (
    <form action={action}>
      <button
        type="submit"
        className="btn btn-danger btn-sm"
        onClick={handleClick}
      >
        Eliminar
      </button>
    </form>
  )
}
