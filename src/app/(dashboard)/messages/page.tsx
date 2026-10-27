// /messages: the list is drawn by the layout (MessagesShell); this is the right-hand side before a conversation is open.
// Below 1280px the list fills the screen and this note is hidden.
import { MessageCircle } from 'lucide-react'

export default function MessagesPage() {
  return (
    <div className="dash-card dash-state msg-empty" data-testid="messages-pick" style={{ flex: 1, justifyContent: 'center' }}>
      <div className="dash-state-ico is-brand"><MessageCircle className="h-6 w-6" aria-hidden="true" /></div>
      <h2>Pick a conversation</h2>
      <p>Choose a student on the left to read and answer their messages.</p>
    </div>
  )
}
