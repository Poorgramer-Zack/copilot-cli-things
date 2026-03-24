# MCP Builder Scripts

Evaluation harness for testing MCP servers.

## Setup

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your_key
```

## Usage

### Test via stdio (local server)

```bash
# Python server
python evaluation.py -t stdio -c python -a my_server.py evaluation.xml

# Node server
python evaluation.py -t stdio -c node -a dist/index.js evaluation.xml
```

### Test via HTTP (remote server)

```bash
python evaluation.py -t http --url http://localhost:3000/mcp evaluation.xml
```

### Options

| Flag | Description |
|------|-------------|
| `-t` | Transport: `stdio`, `sse`, `http` |
| `-c` | Command (stdio only) |
| `-a` | Args (stdio only) |
| `--url` | Server URL (sse/http) |
| `--headers` | Auth headers (key=value) |
| `-m` | Model (default: claude-sonnet-4-20250514) |
| `-o` | Output report file |

## Files

- `evaluation.py` — Main evaluation harness
- `connections.py` — MCP transport connection handlers
- `requirements.txt` — Python dependencies
