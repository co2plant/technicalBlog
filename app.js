const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { marked } = require('marked');

const app = express();
const PORT = process.env.PORT || 3000;

// 데이터베이스 초기화
const db = new sqlite3.Database('./blog.db');

// 테이블 생성 및 샘플 데이터
// 데이터베이스 초기화 함수
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                excerpt TEXT,
                date DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('테이블 생성 오류:', err);
                    reject(err);
                    return;
                }
                
                db.get("SELECT COUNT(*) as count FROM posts", (err, row) => {
                    if (err) {
                        console.error('데이터 확인 오류:', err);
                        reject(err);
                        return;
                    }
                    
                    if (row.count === 0) {
                        const stmt = db.prepare("INSERT INTO posts (title, content, excerpt) VALUES (?, ?, ?)");
                        stmt.run("첫 번째 게시글", 
                            "# 블로그 시작\n\n안녕하세요! **마크다운**을 지원하는 기술 블로그입니다.\n\n## 주요 기능\n- 마크다운 문법 지원\n- 코드 하이라이팅\n- 반응형 디자인", 
                            "마크다운을 지원하는 블로그 시작");
                        stmt.run("Node.js 마크다운 가이드", 
                            "# Node.js와 Markdown\n\n## 설치\n```bash\nnpm install marked\n```\n\n## 사용법\n```javascript\nconst { marked } = require('marked');\nconst html = marked('# Hello World');\n```", 
                            "Node.js에서 마크다운 사용하기");
                        stmt.finalize((err) => {
                            if (err) {
                                console.error('데이터 삽입 오류:', err);
                                reject(err);
                            } else {
                                console.log('샘플 데이터 삽입 완료');
                                resolve();
                            }
                        });
                    } else {
                        console.log('기존 데이터 존재, 삽입 생략');
                        resolve();
                    }
                });
            });
        });
    });
}

// 데이터베이스 초기화 실행
initializeDatabase().then(() => {
    console.log('데이터베이스 초기화 완료');
}).catch(err => {
    console.error('데이터베이스 초기화 실패:', err);
});

// 미들웨어 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));



app.get('/', (req, res, next) => {
    console.log('메인 페이지 요청');
    db.all("SELECT * FROM posts ORDER BY date DESC", (err, posts) => {
        if (err) {
            console.error('데이터베이스 조회 오류:', err);
            return next(err); // 에러 미들웨어로 전달
        }
        console.log('조회된 게시글 수:', posts.length);
        res.render('index', { 
            title: 'co2plant 기술 블로그',
            posts 
        });
    });
});

app.get('/posts', (req, res, next) => {
    console.log('게시글 목록 요청');
    db.all("SELECT * FROM posts ORDER BY date DESC", (err, posts) => {
        if (err) {
            console.error('데이터베이스 조회 오류:', err);
            return next(err); // 에러 미들웨어로 전달
        }
        console.log('조회된 게시글 수:', posts.length);
        res.render('posts', { 
            title: '모든 게시글 - 기술 블로그',
            posts 
        });
    });
})

app.get('/posts/:id', (req, res, next) => {
    const id = req.params.id;
    console.log('게시글 상세 요청, ID:', id);
    
    db.get("SELECT * FROM posts WHERE id = ?", [id], (err, post) => {
        if (err) {
            console.error('데이터베이스 조회 오류:', err);
            return next(err); // 에러 미들웨어로 전달
        }
        if (!post) {
            console.log('게시글을 찾을 수 없음, ID:', id);
            // 404 에러 객체 생성하여 전달
            const error = new Error('게시글을 찾을 수 없습니다');
            error.status = 404;
            return next(error);
        }
        
        console.log('게시글 찾음:', post.title);
        
        // 마크다운을 HTML로 변환
        const htmlContent = marked(post.content);
        post.htmlContent = htmlContent;
        
        res.render('post', { 
            title: post.title + ' - 기술 블로그',
            post 
        });
    });
});

// About 페이지
// app.get('/about', (req, res) => {
//     console.log('About 페이지 요청');
//     res.render('about');
// });

// 404 에러 처리 (모든 라우트 후에 위치)
app.use((req, res, next) => {
    console.log('404 오류: 페이지를 찾을 수 없음 -', req.url);
    res.status(404).render('error', {
        status: 404,
        message: '페이지를 찾을 수 없습니다.',
        error: null
    });
});

// 전역 에러 처리 미들웨어
app.use((error, req, res, next) => {
    console.error('서버 오류 발생:', error);
    
    // 상태 코드 설정 (기본값: 500)
    const status = error.status || error.statusCode || 500;
    
    // 개발 환경에서는 상세 에러 정보 포함
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(status).render('error', {
        status: status,
        message: status === 500 ? '서버 내부 오류가 발생했습니다.' : error.message || '오류가 발생했습니다.',
        error: isDevelopment ? error : null
    });
});


// 데이터베이스 초기화 후 서버 시작
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
    });
}).catch(err => {
    console.error('서버 시작 실패:', err);
});
