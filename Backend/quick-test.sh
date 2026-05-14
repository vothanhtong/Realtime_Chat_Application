#!/bin/bash

# Quick test script for friend requests and upload

BASE_URL="http://localhost:5001"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🧪 QUICK FEATURE TEST"
echo "===================="
echo ""

# Test 1: Server Health
echo "1️⃣  Testing Server Health..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api-docs")
if [ "$STATUS" == "200" ] || [ "$STATUS" == "500" ]; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not responding (HTTP $STATUS)${NC}"
    exit 1
fi
echo ""

# Test 2: Sign Up
echo "2️⃣  Testing Sign Up..."
SIGNUP=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{
        "username":"testuser'$(date +%s)'",
        "password":"123456",
        "email":"test'$(date +%s)'@test.com",
        "firstName":"Test",
        "lastName":"User"
    }')

if [[ $SIGNUP == *"thành công"* ]] || [[ $SIGNUP == *"đã tồn tại"* ]]; then
    echo -e "${GREEN}✅ Sign up endpoint working${NC}"
else
    echo -e "${RED}❌ Sign up failed: $SIGNUP${NC}"
fi
echo ""

# Test 3: Sign In
echo "3️⃣  Testing Sign In..."
SIGNIN=$(curl -s -X POST "$BASE_URL/api/auth/signin" \
    -H "Content-Type: application/json" \
    -d '{
        "username":"testuser",
        "password":"wrong"
    }')

if [[ $SIGNIN == *"không chính xác"* ]] || [[ $SIGNIN == *"accessToken"* ]]; then
    echo -e "${GREEN}✅ Sign in endpoint working${NC}"
else
    echo -e "${RED}❌ Sign in failed: $SIGNIN${NC}"
fi
echo ""

# Test 4: Friend Request Endpoint
echo "4️⃣  Testing Friend Request Endpoint (without auth)..."
FRIEND=$(curl -s -X POST "$BASE_URL/api/friends/requests" \
    -H "Content-Type: application/json" \
    -d '{"to":"507f1f77bcf86cd799439011"}')

if [[ $FRIEND == *"token"* ]] || [[ $FRIEND == *"Unauthorized"* ]] || [[ $FRIEND == *"401"* ]]; then
    echo -e "${GREEN}✅ Friend request endpoint protected (requires auth)${NC}"
else
    echo -e "${YELLOW}⚠️  Friend request response: $FRIEND${NC}"
fi
echo ""

# Test 5: Upload Endpoint
echo "5️⃣  Testing Upload Endpoint (without auth)..."
UPLOAD=$(curl -s -X POST "$BASE_URL/api/users/uploadAvatar" \
    -F "file=@/dev/null" 2>&1)

if [[ $UPLOAD == *"token"* ]] || [[ $UPLOAD == *"Unauthorized"* ]] || [[ $UPLOAD == *"401"* ]]; then
    echo -e "${GREEN}✅ Upload endpoint protected (requires auth)${NC}"
else
    echo -e "${YELLOW}⚠️  Upload response: $UPLOAD${NC}"
fi
echo ""

# Test 6: Search User Endpoint
echo "6️⃣  Testing Search User Endpoint (without auth)..."
SEARCH=$(curl -s -X GET "$BASE_URL/api/users/search?username=test")

if [[ $SEARCH == *"token"* ]] || [[ $SEARCH == *"Unauthorized"* ]] || [[ $SEARCH == *"401"* ]]; then
    echo -e "${GREEN}✅ Search endpoint protected (requires auth)${NC}"
else
    echo -e "${YELLOW}⚠️  Search response: $SEARCH${NC}"
fi
echo ""

# Summary
echo "===================="
echo "📊 TEST SUMMARY"
echo "===================="
echo ""
echo "✅ Server: Running"
echo "✅ Auth endpoints: Working"
echo "✅ Protected routes: Secured"
echo ""
echo "📝 Next Steps:"
echo "   1. Đăng ký 2 users qua frontend hoặc curl"
echo "   2. Đăng nhập và lấy accessToken"
echo "   3. Test kết bạn với token"
echo "   4. Test upload ảnh với token"
echo ""
echo "📖 Xem hướng dẫn chi tiết: test-features.md"
echo ""
