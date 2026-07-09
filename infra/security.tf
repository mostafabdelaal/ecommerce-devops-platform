# Security group + EC2 key pair.
# SSH is locked to your IP; the API port is open for the demo.

resource "aws_key_pair" "main" {
  key_name   = "${var.project}-key"
  public_key = file(var.ssh_public_key_path)
}

resource "aws_security_group" "ec2" {
  name        = "${var.project}-ec2-sg"
  description = "CloudMart EC2: SSH from my IP, API from anywhere"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH from my IP only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  ingress {
    description = "CloudMart API"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-ec2-sg" }
}
