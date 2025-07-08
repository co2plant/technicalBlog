const express = require('express');
const path = require('path');

const app = express();

// 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

app.set('port', process.env.PORT || 8080);

// 메인 페이지
app.get('/', (req, res) => {
    const samplePosts = [
        {
            id: 1,
            title: '첫 번째 게시글',
            date: '2024-01-15',
            excerpt: '블로그를 시작하며 첫 번째 글을 작성합니다.'
        },
        {
            id: 2,
            title: 'Node.js와 Express 시작하기',
            date: '2024-01-20',
            excerpt: 'Node.js와 Express를 사용한 웹 개발의 기초를 알아봅시다.'
        }
    ];
    
    res.render('index', {
        title: '기술 블로그',
        posts: samplePosts
    });
});

// 포스트 상세 페이지
app.get('/posts/:id', (req, res) => {
    const postId = parseInt(req.params.id);
    
    // 샘플 포스트 데이터 (실제로는 데이터베이스에서 가져옴)
    const samplePost = {
        id: postId,
        title: postId === 1 ? '첫 번째 게시글' : 'Node.js와 Express 시작하기',
        date: postId === 1 ? '2024-01-15' : '2024-01-20',
        category: postId === 1 ? 'General' : 'Node.js',
        content: postId === 1 ? 
            `<h2>블로그를 시작하며</h2>
            <p>안녕하세요! 새로운 기술 블로그를 시작하게 되었습니다.</p>
            <p>이 블로그에서는 웹 개발과 관련된 다양한 기술들을 다룰 예정입니다.</p>
            <h3>앞으로 다룰 주제들</h3>
            <ul>
                <li>JavaScript 최신 기능들</li>
                <li>Node.js 백엔드 개발</li>
                <li>React 프론트엔드 개발</li>
                <li>데이터베이스 설계</li>
            </ul>
            <p>많은 관심과 피드백 부탁드립니다!</p>` :
            `<h2>Node.js 소개</h2>
            <p>Node.js는 Chrome V8 JavaScript 엔진으로 빌드된 JavaScript 런타임입니다.</p>
            <p>서버 사이드에서 JavaScript를 실행할 수 있게 해주는 플랫폼으로, 비동기 이벤트 기반 아키텍처를 특징으로 합니다.</p>
            
            <h3>Express.js 시작하기</h3>
            <p>Express.js는 Node.js를 위한 빠르고 간결한 웹 프레임워크입니다.</p>
            <pre><code>npm install express
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});</code></pre>
            
            <h3>주요 특징</h3>
            <ul>
                <li>비동기 I/O 처리</li>
                <li>이벤트 기반 아키텍처</li>
                <li>NPM 생태계</li>
                <li>크로스 플랫폼 지원</li>
            </ul>`
    };
    
    res.render('post', {
        title: '기술 블로그',
        post: samplePost
    });
});

// 글 목록 페이지
app.get('/posts', (req, res) => {
    const samplePosts = [
        {
            id: 1,
            title: '첫 번째 게시글',
            date: '2024-01-15',
            excerpt: '블로그를 시작하며 첫 번째 글을 작성합니다.',
            category: 'General'
        },
        {
            id: 2,
            title: 'Node.js와 Express 시작하기',
            date: '2024-01-20',
            excerpt: 'Node.js와 Express를 사용한 웹 개발의 기초를 알아봅시다.',
            category: 'Node.js'
        }
    ];
    
    res.render('posts', {
        title: '기술 블로그',
        posts: samplePosts
    });
});

app.listen(app.get('port'), ()=>{
    console.log(app.get('port'), '번 포트에서 대기 중')
});
