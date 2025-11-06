#!/usr/bin/env python3
"""
Trello Sync Script for DevTools Suite
Syncs tool implementation status with Trello board
"""

import json
import requests
import time
from typing import Dict, List

# Trello API Configuration
API_KEY = '90bf0e8a5767cee07a2901fafa3d41b7'
API_TOKEN = 'ATTA328344330e5d4cff6b51fcf5dd363175cb9df17c9f7662fede50a220ba2921bdD44B2613'
BASE_URL = 'https://api.trello.com/1'

# Known implemented tools
IMPLEMENTED_TOOLS = {
    'json-beautifier', 'yaml-formatter', 'toml-formatter', 'rest-api-tester', 
    'grpc-tester', 'graphql-playground', 'websocket-tester', 'swagger-payload-builder',
    'openapi-test-cases', 'ui-recorder', 'base64-encoder', 'jwt-encoder',
    'hash-generator', 'ssh-key-generator', 'ssl-cert-generator', 'uuid-generator',
    'totp-generator', 'timestamp-converter', 'qr-generator', 'random-xml-generator',
    'data-generator', 'string-profiler', 'regex-tester', 'diff-checker',
    'markdown-visualizer', 'json-compare', 'json-path-finder', 'json-path-extract',
    'json-tree-view', 'json-aggregator', 'json-filter', 'flatten-json',
    'unflatten-json', 'json-escape', 'json-schema-validator', 'yaml-to-json',
    'json-to-yaml', 'json-to-xml', 'xml-to-json', 'yaml-to-toml', 'toml-to-yaml',
    'json-to-toml', 'toml-to-json', 'shell-executor', 'cron-manager', 's3-visualizer',
    'docker-ui', 'kafka-viewer', 'filebeat-viewer', 'vector-viewer', 'code-compare',
    'data-compare', 'code-executor', 'repayment-calculator'
}

class TrelloSync:
    def __init__(self, api_key: str, api_token: str):
        self.api_key = api_key
        self.api_token = api_token
        self.auth_params = {'key': api_key, 'token': api_token}
        
    def _request(self, method: str, endpoint: str, **kwargs):
        """Make authenticated request to Trello API"""
        url = f"{BASE_URL}/{endpoint}"
        params = {**self.auth_params, **kwargs.get('params', {})}
        kwargs['params'] = params
        
        response = requests.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()
    
    def get_boards(self) -> List[Dict]:
        """Get all boards for the authenticated user"""
        return self._request('GET', 'members/me/boards')
    
    def create_board(self, name: str) -> Dict:
        """Create a new board"""
        return self._request('POST', 'boards', params={'name': name})
    
    def get_lists(self, board_id: str) -> List[Dict]:
        """Get all lists in a board"""
        return self._request('GET', f'boards/{board_id}/lists')
    
    def create_list(self, board_id: str, name: str) -> Dict:
        """Create a new list in a board"""
        return self._request('POST', 'lists', params={'name': name, 'idBoard': board_id})
    
    def create_card(self, list_id: str, name: str, desc: str = '', labels: List[str] = None) -> Dict:
        """Create a new card in a list"""
        params = {
            'idList': list_id,
            'name': name,
            'desc': desc
        }
        if labels:
            params['idLabels'] = ','.join(labels)
        return self._request('POST', 'cards', params=params)
    
    def create_label(self, board_id: str, name: str, color: str) -> Dict:
        """Create a label on a board"""
        return self._request('POST', 'labels', params={
            'name': name,
            'color': color,
            'idBoard': board_id
        })
    
    def setup_board(self, board_name: str = "DevTools Suite - Implementation Tracker") -> Dict:
        """Set up complete board structure"""
        print(f"🔧 Setting up board: {board_name}")
        
        # Create board
        board = self.create_board(board_name)
        board_id = board['id']
        print(f"✅ Created board: {board['url']}")
        
        # Delete default lists
        existing_lists = self.get_lists(board_id)
        for lst in existing_lists:
            self._request('PUT', f'lists/{lst["id"]}/closed', params={'value': 'true'})
        
        # Create our lists
        lists = {}
        for list_name in ['Done ✅', 'In Progress 🚧', 'To Do 📋']:
            lst = self.create_list(board_id, list_name)
            lists[list_name] = lst['id']
            print(f"✅ Created list: {list_name}")
        
        # Create labels for categories
        categories = [
            ('Formatters', 'green'),
            ('API Testing', 'yellow'),
            ('Encoders', 'orange'),
            ('Security', 'red'),
            ('Generators', 'purple'),
            ('Text Tools', 'blue'),
            ('Design', 'pink'),
            ('JSON', 'lime'),
            ('Converters', 'sky'),
            ('Network', 'black'),
            ('Image', 'purple'),
            ('Database', 'green'),
            ('DevOps', 'orange'),
            ('Git', 'red'),
            ('Testing', 'yellow'),
            ('Documentation', 'blue')
        ]
        
        labels = {}
        for name, color in categories:
            try:
                label = self.create_label(board_id, name, color)
                labels[name] = label['id']
                print(f"✅ Created label: {name}")
            except Exception as e:
                print(f"⚠️  Label {name}: {e}")
        
        return {
            'board_id': board_id,
            'board_url': board['url'],
            'lists': lists,
            'labels': labels
        }
    
    def import_tools(self, board_setup: Dict):
        """Import all tools from toolconfig.json"""
        print("\n📥 Importing tools...")
        
        # Load tools
        with open('frontend/public/toolconfig.json', 'r') as f:
            data = json.load(f)
        
        lists = board_setup['lists']
        labels = board_setup['labels']
        
        done_count = 0
        todo_count = 0
        
        for i, tool in enumerate(data['tools']):
            # Determine status
            if tool['id'] in IMPLEMENTED_TOOLS:
                list_id = lists['Done ✅']
                done_count += 1
            else:
                list_id = lists['To Do 📋']
                todo_count += 1
            
            # Create card description
            desc = f"""**Description:** {tool['description']}

**Category:** {tool['category']}
**Tool ID:** `{tool['id']}`
**Tier:** {tool['tier']}
**Icon:** {tool['icon']}

---
### Implementation Checklist
- [ ] Design UI/UX
- [ ] Implement core logic
- [ ] Add error handling
- [ ] Write tests
- [ ] Add documentation
- [ ] Code review
- [ ] Deploy to production
"""
            
            # Create card
            try:
                card = self.create_card(
                    list_id=list_id,
                    name=tool['name'],
                    desc=desc
                )
                
                if (i + 1) % 10 == 0:
                    print(f"  📝 Imported {i + 1}/{len(data['tools'])} tools...")
                    time.sleep(0.5)  # Rate limiting
                    
            except Exception as e:
                print(f"❌ Error creating card for {tool['name']}: {e}")
        
        print(f"\n✅ Import complete!")
        print(f"   - Done: {done_count} tools")
        print(f"   - To Do: {todo_count} tools")
        print(f"   - Total: {len(data['tools'])} tools")

def main():
    """Main function"""
    print("🚀 DevTools Suite - Trello Sync\n")
    
    # Initialize Trello client
    trello = TrelloSync(API_KEY, API_TOKEN)
    
    # Test connection
    try:
        boards = trello.get_boards()
        print(f"✅ Connected to Trello! Found {len(boards)} boards.\n")
    except Exception as e:
        print(f"❌ Failed to connect to Trello: {e}")
        print("\n⚠️  Please verify your API credentials:")
        print("   1. Go to: https://trello.com/app-key")
        print("   2. Copy your API Key")
        print("   3. Generate a new Token")
        print("   4. Update API_KEY and API_TOKEN in this script")
        return
    
    # Ask user if they want to create new board or use existing
    print("Options:")
    print("1. Create new board")
    print("2. Use existing board")
    choice = input("\nEnter choice (1 or 2): ").strip()
    
    if choice == '1':
        # Set up new board
        board_setup = trello.setup_board()
        print(f"\n🎉 Board created: {board_setup['board_url']}")
        
        # Import tools
        import_choice = input("\nImport all 337 tools now? (y/n): ").strip().lower()
        if import_choice == 'y':
            trello.import_tools(board_setup)
            print(f"\n🎉 All done! Visit: {board_setup['board_url']}")
    
    elif choice == '2':
        # List existing boards
        print("\nYour boards:")
        for i, board in enumerate(boards[:20], 1):
            print(f"{i}. {board['name']} (ID: {board['id']})")
        
        board_num = int(input("\nEnter board number: ").strip())
        selected_board = boards[board_num - 1]
        
        print(f"\n✅ Selected: {selected_board['name']}")
        print("⚠️  Note: You'll need to manually set up lists and labels")
        print(f"   Board URL: {selected_board['url']}")

if __name__ == '__main__':
    main()
