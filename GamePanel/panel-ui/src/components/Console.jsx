import { useState, useEffect, useRef } from 'react';
import './Console.css';

function Console({ logs, onSendCommand }) {
    const [command, setCommand] = useState('');
    const logsEndRef = useRef(null);
    const logsContainerRef = useRef(null);
    const [autoScroll, setAutoScroll] = useState(true);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (autoScroll) {
            scrollToBottom();
        }
    }, [logs, autoScroll]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
        setAutoScroll(isAtBottom);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (command.trim()) {
            onSendCommand(command.trim());
            setCommand('');
        }
    };

    return (
        <div className="console-container">
            <div
                className="console-logs"
                ref={logsContainerRef}
                onScroll={handleScroll}
            >
                {logs.map((log, index) => (
                    <div key={index} className="log-line">
                        {log}
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="console-input">
                <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="Enter command (e.g., /say Hello)"
                    className="command-input"
                />
                <button type="submit" className="send-button">Send</button>
            </form>
        </div>
    );
}

export default Console;
