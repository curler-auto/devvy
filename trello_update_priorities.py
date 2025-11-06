#!/usr/bin/env python3
"""
Trello Priority Update Script
Add priority labels to tools for color-coded tracking
"""

import json
import requests
import time
from typing import Dict, List

# Trello API Configuration
API_KEY = '90bf0e8a5767cee07a2901fafa3d41b7'
API_TOKEN = 'ATTA328344330e5d4cff6b51fcf5dd363175cb9df17c9f7662fede50a220ba2921bdD44B2613'
BASE_URL = 'https://api.trello.com/1'
BOARD_ID = '690b0626027ca22ca6a32f17'  # Your board ID

# Priority definitions with tool assignments
PRIORITIES = {
    'P0 - Critical': {
        'color': 'red',
        'tools': [
            # Most requested/essential tools
            'json-beautifier', 'base64-encoder', 'jwt-encoder', 'uuid-generator',
            'hash-generator', 'url-encoder', 'password-generator', 'timestamp-converter',
            'regex-tester', 'sql-formatter', 'rest-api-tester', 'diff-checker',
            'json-compare', 'yaml-to-json', 'json-to-yaml', 'xml-formatter',
            'color-picker', 'qr-generator', 'markdown-visualizer', 'code-executor'
        ]
    },
    'P1 - High': {
        'color': 'orange',
        'tools': [
            # High-value formatters and converters
            'css-formatter', 'html-formatter', 'javascript-formatter', 'python-formatter',
            'json-to-xml', 'xml-to-json', 'csv-to-json', 'json-to-csv',
            'image-converter', 'image-resizer', 'image-compressor', 'pdf-merger',
            'text-case-converter', 'word-counter', 'lorem-ipsum', 'slug-generator',
            'ip-calculator', 'dns-lookup', 'whois-lookup', 'ssl-checker',
            'mock-server', 'test-data-generator', 'unit-test-generator'
        ]
    },
    'P2 - Medium': {
        'color': 'yellow',
        'tools': [
            # Useful but not critical
            'typescript-formatter', 'java-formatter', 'go-formatter', 'graphql-formatter',
            'json-to-typescript', 'json-to-go', 'json-to-python', 'curl-to-code',
            'image-cropper', 'image-watermark', 'svg-optimizer', 'favicon-generator',
            'network-latency-tester', 'jitter-calculator', 'packet-loss-tester',
            'git-command-builder', 'gitignore-generator', 'commit-message-generator',
            'readme-generator', 'changelog-generator', 'license-generator'
        ]
    },
    'P3 - Low': {
        'color': 'green',
        'tools': [
            # Nice to have, specialized tools
            'rust-formatter', 'protobuf-formatter', 'dockerfile-formatter',
            'morse-code', 'rot13-encoder', 'ascii-art-generator',
            'ethereum-unit-converter', 'smart-contract-analyzer', 'wallet-generator',
            'bgp-lookup', 'asn-lookup', 'proxy-detector',
            'sprite-sheet-generator', 'image-ascii-art', 'barcode-scanner',
            'badge-generator', 'twitter-card-generator', 'schema-org-generator'
        ]
    },
    'P4 - Future': {
        'color': 'blue',
        'tools': []  # All remaining tools will be P4
    }
}

class TrelloUpdater:
    def __init__(self, api_key: str, api_token: str, board_id: str):
        self.api_key = api_key
        self.api_token = api_token
        self.board_id = board_id
        self.auth_params = {'key': api_key, 'token': api_token}
        
    def _request(self, method: str, endpoint: str, **kwargs):
        """Make authenticated request to Trello API"""
        url = f"{BASE_URL}/{endpoint}"
        params = {**self.auth_params, **kwargs.get('params', {})}
        kwargs['params'] = params
        
        response = requests.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()
    
    def get_board_labels(self) -> List[Dict]:
        """Get all labels on the board"""
        return self._request('GET', f'boards/{self.board_id}/labels')
    
    def create_label(self, name: str, color: str) -> Dict:
        """Create a new label"""
        return self._request('POST', 'labels', params={
            'name': name,
            'color': color,
            'idBoard': self.board_id
        })
    
    def get_all_cards(self) -> List[Dict]:
        """Get all cards on the board"""
        return self._request('GET', f'boards/{self.board_id}/cards')
    
    def add_label_to_card(self, card_id: str, label_id: str):
        """Add a label to a card"""
        return self._request('POST', f'cards/{card_id}/idLabels', params={
            'value': label_id
        })
    
    def update_card_description(self, card_id: str, description: str):
        """Update card description"""
        return self._request('PUT', f'cards/{card_id}', params={
            'desc': description
        })

def main():
    print("🎨 DevTools Suite - Priority Labels Setup\n")
    
    updater = TrelloUpdater(API_KEY, API_TOKEN, BOARD_ID)
    
    # Step 1: Create priority labels
    print("📋 Step 1: Creating priority labels...")
    existing_labels = updater.get_board_labels()
    existing_label_names = {label['name']: label for label in existing_labels}
    
    priority_labels = {}
    for priority_name, priority_info in PRIORITIES.items():
        if priority_name in existing_label_names:
            print(f"   ✓ Label exists: {priority_name}")
            priority_labels[priority_name] = existing_label_names[priority_name]
        else:
            label = updater.create_label(priority_name, priority_info['color'])
            priority_labels[priority_name] = label
            print(f"   ✅ Created: {priority_name} ({priority_info['color']})")
    
    # Step 2: Load tool config to get tool names
    print("\n📖 Step 2: Loading tool configuration...")
    with open('frontend/public/toolconfig.json', 'r') as f:
        tool_config = json.load(f)
    
    tool_id_to_name = {tool['id']: tool['name'] for tool in tool_config['tools']}
    print(f"   ✓ Loaded {len(tool_id_to_name)} tools")
    
    # Step 3: Create priority mapping
    print("\n🗺️  Step 3: Creating priority mapping...")
    tool_priorities = {}
    for priority_name, priority_info in PRIORITIES.items():
        for tool_id in priority_info['tools']:
            if tool_id in tool_id_to_name:
                tool_priorities[tool_id_to_name[tool_id]] = priority_name
    
    # All remaining tools get P4
    for tool_id, tool_name in tool_id_to_name.items():
        if tool_name not in tool_priorities:
            tool_priorities[tool_name] = 'P4 - Future'
    
    print(f"   ✓ Mapped {len(tool_priorities)} tools to priorities")
    
    # Step 4: Get all cards and update them
    print("\n🔄 Step 4: Updating cards with priority labels...")
    cards = updater.get_all_cards()
    print(f"   Found {len(cards)} cards")
    
    updated_count = 0
    priority_counts = {p: 0 for p in PRIORITIES.keys()}
    
    for i, card in enumerate(cards):
        card_name = card['name']
        
        if card_name in tool_priorities:
            priority = tool_priorities[card_name]
            label_id = priority_labels[priority]['id']
            
            # Check if label already exists on card
            existing_label_ids = [label['id'] for label in card.get('labels', [])]
            
            if label_id not in existing_label_ids:
                try:
                    updater.add_label_to_card(card['id'], label_id)
                    updated_count += 1
                    priority_counts[priority] += 1
                    
                    if (i + 1) % 20 == 0:
                        print(f"   📝 Updated {i + 1}/{len(cards)} cards...")
                        time.sleep(0.3)  # Rate limiting
                        
                except Exception as e:
                    print(f"   ⚠️  Error updating {card_name}: {e}")
    
    print(f"\n✅ Update complete!")
    print(f"   Updated: {updated_count} cards")
    print(f"\n📊 Priority Distribution:")
    for priority, count in priority_counts.items():
        color_emoji = {
            'P0 - Critical': '🔴',
            'P1 - High': '🟠',
            'P2 - Medium': '🟡',
            'P3 - Low': '🟢',
            'P4 - Future': '🔵'
        }
        print(f"   {color_emoji.get(priority, '⚪')} {priority}: {count} tools")
    
    print(f"\n🎉 All done! Visit your board to see color-coded priorities:")
    print(f"   https://trello.com/b/{BOARD_ID}")

if __name__ == '__main__':
    main()
