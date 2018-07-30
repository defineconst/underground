FROM node

RUN mkdir -p /underground
ADD package.json /underground

WORKDIR /underground

RUN npm install

ADD . /underground/

CMD ./run.sh
