pipeline {
    agent any

    environment {
        // Nama image dan container
        DOCKER_IMAGE = "absensi-sppg-frontend"
        CONTAINER_NAME = "web-absensi-sppg"
        // Ganti 8080 dengan port yang kosong, misalnya 3003
        PORT_MAPPING = "3003:80" 
    }

    stages {
        stage('Checkout') {
            steps {
                // Checkout source code dari repository (diatur otomatis oleh Jenkins jika via SCM)
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo "Membangun Docker Image: ${DOCKER_IMAGE}:latest"
                    sh "docker build -t ${DOCKER_IMAGE}:latest ."
                }
            }
        }

        stage('Deploy to VPS Container') {
            steps {
                script {
                    echo "Menghentikan dan menghapus container lama (jika ada)..."
                    sh "docker stop ${CONTAINER_NAME} || true"
                    sh "docker rm ${CONTAINER_NAME} || true"

                    echo "Menjalankan container baru..."
                    sh "docker run -d --restart unless-stopped --name ${CONTAINER_NAME} -p ${PORT_MAPPING} ${DOCKER_IMAGE}:latest"
                }
            }
        }
        
        stage('Cleanup') {
            steps {
                script {
                    // Menghapus image dangling (none) untuk menghemat ruang disk VPS
                    sh "docker image prune -f"
                }
            }
        }
    }
}