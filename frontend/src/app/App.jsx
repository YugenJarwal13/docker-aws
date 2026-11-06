import "./App.css"
import { Editor } from "@monaco-editor/react"
import { MonacoBinding } from "y-monaco"
import { useMemo, useState, useEffect } from "react"
import * as Y from "yjs"
import { SocketIOProvider } from "y-socket.io"

const USER_COLORS = [
  "#f87171", "#fb923c", "#fbbf24", "#34d399",
  "#60a5fa", "#818cf8", "#a78bfa", "#f472b6"
]

function App() {
  const [editor, setEditor] = useState(null)
  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || ""
  })
  const [users, setUsers] = useState([])

  const ydoc = useMemo(() => new Y.Doc(), [])
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc])

  const handleMount = (editorInstance) => {
    setEditor(editorInstance)
  }

  const handleJoin = (e) => {
    e.preventDefault()
    const entered = e.target.username.value.trim()
    if (!entered) return
    setUsername(entered)
    window.history.pushState({}, "", "?username=" + encodeURIComponent(entered))
  }

  useEffect(() => {
    if (!username || !editor) return

    // Connect to backend server on port 3000
    const provider = new SocketIOProvider("http://localhost:3000", "monaco", ydoc, {
      autoConnect: true,
    })

    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]

    // Set local awareness with user info
    provider.awareness.setLocalStateField("user", {
      username,
      color,
    })

    // Bind Monaco editor to Yjs Text WITH awareness for cursors & live text sync
    const binding = new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    )

    const updateUsers = () => {
      const states = Array.from(provider.awareness.getStates().values())
      const activeUsers = states
        .filter((state) => state.user && state.user.username)
        .map((state) => state.user)
      setUsers(activeUsers)
    }

    provider.awareness.on("change", updateUsers)
    updateUsers()

    return () => {
      binding.destroy()
      provider.disconnect()
      provider.destroy()
    }
  }, [editor, username, ydoc, yText])

  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex gap-4 p-4 items-center justify-center">
        <form
          onSubmit={handleJoin}
          className="flex flex-col gap-4 bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-2xl w-full max-w-sm"
        >
          <h1 className="text-xl font-bold text-white text-center">Join Collaborative Session</h1>
          <input
            type="text"
            placeholder="Enter your username"
            className="p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-amber-400"
            name="username"
            required
            autoFocus
          />
          <button
            type="submit"
            className="p-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold transition"
          >
            Join
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">
      <aside className="h-full w-1/4 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Active Users</h2>
          <span className="text-xs bg-emerald-900/60 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-700/50">
            {users.length} Online
          </span>
        </div>
        <ul className="p-4 flex-1 overflow-y-auto space-y-2">
          {users.map((user, index) => (
            <li
              key={index}
              className="p-2.5 bg-gray-800/80 border border-gray-700/50 text-white rounded-lg flex items-center gap-2.5"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow"
                style={{ backgroundColor: user.color || "#10b981" }}
              />
              <span className="font-medium truncate">{user.username}</span>
              {user.username === username && (
                <span className="text-xs text-amber-400 ml-auto font-mono">(You)</span>
              )}
            </li>
          ))}
        </ul>
      </aside>

      <section className="h-full flex-1 bg-neutral-900 rounded-xl overflow-hidden border border-gray-800">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// Collaborative code editor&#10;// Type here and changes will sync in real time!&#10;"
          theme="vs-dark"
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            smoothScrolling: true,
          }}
        />
      </section>
    </main>
  )
}

export default App
