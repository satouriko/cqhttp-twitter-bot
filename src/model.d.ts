declare enum ChatType {
  Private = 'private',
  Group = 'group',
  Discuss = 'discuss',
}

interface IChat {
  chatID: number,
  chatType: ChatType,
}