const express = require('express');
const cors = require('cors');
const path = require('path');
const { marked } = require('marked');

const app = express();

// CORS 설정
app.use(cors());
app.use(express.json());

// 뷰 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

app.set('port', process.env.PORT || 3000);

// 디버깅용 간단한 테스트 라우트
app.get('/test', (req, res) => {
    res.send('<h1>Test Page - Server is working!</h1>');
});

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
    
    const data = {
        title: '기술 블로그',
        posts: samplePosts
    };
    
    console.log('Rendering with data:', data);
    
    try {
        res.render('index', data);
    } catch (error) {
        console.error('Render error:', error);
        res.status(500).send('Server Error: ' + error.message);
    }
});

// 포스트 상세 페이지
app.get('/posts/:id', (req, res) => {
    const postId = parseInt(req.params.id);
    
    const post = db.get('SELECT * FROM posts WHERE id = ?', postId)

    if(post){
        const htmlContent = marked(post.content);

        res.render('post', {
            title: post.title,
            content: htmlContent
        });
    }
    else{
        res.status(404).send('Post not found');
    }
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
